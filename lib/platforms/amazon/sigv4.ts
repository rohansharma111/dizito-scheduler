import crypto from "node:crypto";

const SERVICE = "execute-api";
const DEFAULT_REGION = "eu-west-1";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function getAwsRegion() {
  return process.env.AMAZON_AWS_REGION || DEFAULT_REGION;
}

function getAwsCredentials() {
  const accessKeyId = requiredEnv("AMAZON_AWS_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("AMAZON_AWS_SECRET_ACCESS_KEY");
  const sessionToken = process.env.AMAZON_AWS_SESSION_TOKEN || null;
  return { accessKeyId, secretAccessKey, sessionToken };
}

function hash(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: crypto.BinaryLike, value: string) {
  return crypto.createHmac("sha256", key).update(value, "utf8").digest();
}

function awsEncode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function canonicalQuery(url: URL) {
  return Array.from(url.searchParams.entries())
    .map(([key, value]) => [awsEncode(key), awsEncode(value)] as const)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey),
    )
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function canonicalUri(url: URL) {
  const pathname = url.pathname || "/";
  return pathname
    .split("/")
    .map((segment) => awsEncode(decodeURIComponent(segment)))
    .join("/");
}

export interface AmazonSigV4Input {
  url: URL;
  method: string;
  body: string;
  headers: Record<string, string>;
  now?: Date;
}

export function signAmazonSpApiRequest(input: AmazonSigV4Input) {
  const { accessKeyId, secretAccessKey, sessionToken } = getAwsCredentials();
  const region = getAwsRegion();
  const now = input.now ?? new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const dateStamp = amzDate.slice(0, 8);

  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(input.headers)) {
    headers[name.toLowerCase()] = value.trim().replace(/\s+/g, " ");
  }
  headers.host = input.url.host;
  headers["x-amz-date"] = amzDate;
  if (sessionToken) headers["x-amz-security-token"] = sessionToken;

  const signedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderNames
    .map((name) => `${name}:${headers[name]}\n`)
    .join("");
  const signedHeaders = signedHeaderNames.join(";");
  const payloadHash = hash(input.body);

  const canonicalRequest = [
    input.method.toUpperCase(),
    canonicalUri(input.url),
    canonicalQuery(input.url),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    hash(canonicalRequest),
  ].join("\n");

  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, SERVICE);
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    ...headers,
    authorization,
  };
}
