export interface PlaceSuggestion {
  /** Google place id — opaque to the client. */
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
   * Same UUID across all suggest calls + the final retrieve. Frontend
   * generates it when the picker opens; Google bills the whole flow as one
   * session unit (N suggests + 1 retrieve).
   */
  sessionToken: string;
}

export interface RetrieveParams {
  sessionToken: string;
}
