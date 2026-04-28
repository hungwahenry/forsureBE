export const PLACE_SEARCH_PROVIDER_TOKEN = Symbol('PLACE_SEARCH_PROVIDER_TOKEN');

export interface PlaceSuggestion {
  /** Provider-specific identifier — opaque to the client. */
  id: string;
  /** Primary line: venue/place name. */
  name: string;
  /** Secondary line: formatted address / context. */
  description: string;
}

export interface PlaceDetails {
  id: string;
  name?: string;
  address: string;
  lat: number;
  lng: number;
}

export interface SuggestParams {
  q: string;
  proximity?: { lat: number; lng: number };
  /**
   * Same UUID across all suggest calls + the final retrieve. The frontend
   * generates this when the picker opens; both providers use it for
   * session-based billing (N suggests + 1 retrieve = 1 unit).
   */
  sessionToken: string;
}

export interface RetrieveParams {
  sessionToken: string;
}

export interface PlaceSearchProvider {
  suggest(params: SuggestParams): Promise<PlaceSuggestion[]>;
  retrieve(id: string, params: RetrieveParams): Promise<PlaceDetails>;
}
