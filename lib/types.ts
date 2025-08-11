export type SpotifyToken = {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // epoch seconds
  scope: string;
  token_type: "Bearer";
};
