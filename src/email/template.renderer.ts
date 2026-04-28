import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import Handlebars from 'handlebars';
import * as path from 'path';
import { RenderedEmail } from './rendered-email';

type Compiled = Handlebars.TemplateDelegate;

@Injectable()
export class TemplateRenderer implements OnModuleInit {
  private readonly logger = new Logger(TemplateRenderer.name);
  private readonly templates = new Map<string, Compiled>();
  private readonly templatesDir = path.join(__dirname, 'templates');

  onModuleInit(): void {
    this.registerHelpers();
    this.registerPartials();
  }

  /** Render a template trio (subject + html + text) with the given data. */
  renderEmail(name: string, data: Record<string, unknown>): RenderedEmail {
    return {
      subject: this.compileFile(`${name}/subject.hbs`)(data).trim(),
      html: this.compileFile(`${name}/html.hbs`)(data),
      text: this.compileFile(`${name}/text.hbs`)(data),
    };
  }

  private compileFile(relPath: string): Compiled {
    const cached = this.templates.get(relPath);
    if (cached) return cached;
    const fullPath = path.join(this.templatesDir, relPath);
    const source = fs.readFileSync(fullPath, 'utf8');
    const compiled = Handlebars.compile(source, { noEscape: false });
    this.templates.set(relPath, compiled);
    return compiled;
  }

  /** Register every `_*.hbs` file in templatesDir as a Handlebars partial. */
  private registerPartials(): void {
    const entries = fs.readdirSync(this.templatesDir);
    for (const entry of entries) {
      if (entry.startsWith('_') && entry.endsWith('.hbs')) {
        const name = entry.replace(/\.hbs$/, '');
        const source = fs.readFileSync(
          path.join(this.templatesDir, entry),
          'utf8',
        );
        Handlebars.registerPartial(name, source);
        this.logger.debug(`Registered email partial: ${name}`);
      }
    }
  }

  private registerHelpers(): void {
    Handlebars.registerHelper('concat', (...args: unknown[]) =>
      args.slice(0, -1).join(''),
    );
  }
}
