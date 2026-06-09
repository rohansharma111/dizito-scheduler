export async function GET() {

  const token =
    "EAAOO0cbcN7MBRhJpJLfgkyJWjRMJPoFDGSitbY1QB73uWuOSDJdVYSLzpqvOxwn61QrWYMHTx7HarLEKWSPHK95Ousg7w0hZCVwRv8K1NSk1XdW5cHyZA1GtPfPYqbWEM2sqZCMkASeMTYUlBgnHu3N3cHUw6AzsnaNp3i73uYo7Jvp7RA1CwyocMuBmS9WOt8Ano4OdwnFJfFmScXITaiHRzwlTHC098TY9G6W187B5KSsGBX8IYobNcA6dejoZAusMdBF0O4ZAB1hfOeZALxuStVYsGTJHwh";

  const response =
    await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${token}`
    );

  const data =
    await response.json();

  return Response.json(data);

}