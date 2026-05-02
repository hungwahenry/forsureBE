export interface SuggestParams {
  q: string;
  proximity?: { lat: number; lng: number };
  sessionToken: string;
}

export interface RetrieveParams {
  sessionToken: string;
}
