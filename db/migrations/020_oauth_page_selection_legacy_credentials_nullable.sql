ALTER TABLE oauth_page_selections
  ALTER COLUMN access_token DROP NOT NULL,
  ALTER COLUMN pages DROP NOT NULL;
