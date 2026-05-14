export interface OverviewPicksWindow {
  count: number;
  totalCents: number;
}

export interface OverviewTopVenue {
  id: string;
  placeName: string;
  picksCount: number;
  totalCents: number;
}

export interface OverviewRecentBoost {
  id: string;
  activityId: string;
  activityEmoji: string;
  activityTitle: string;
  startsAt: string;
  endsAt: string;
  cancelledAt: string | null;
  chargedCents: number;
  isOverage: boolean;
  createdAt: string;
}

export interface OverviewDailyPicks {
  date: string;
  count: number;
  totalCents: number;
}

export interface OwnerBusinessOverviewDto {
  venuesCount: number;
  venuesActive: number;
  venuesPaused: number;
  activeBoostsCount: number;
  boostsEndingTodayCount: number;
  venuePicks30d: OverviewPicksWindow;
  venuePicksPrior30d: OverviewPicksWindow;
  picksByDay30d: OverviewDailyPicks[];
  topVenues30d: OverviewTopVenue[];
  recentBoosts: OverviewRecentBoost[];
}
