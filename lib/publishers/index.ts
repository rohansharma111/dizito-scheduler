import { publishToFacebook } from "./facebook";
import { publishToInstagram } from "./instagram";
import { publishToLinkedIn } from "./linkedin";
import { publishToPinterest } from "./pinterest";

export const publishers = {
  facebook: publishToFacebook,
  instagram: publishToInstagram,
  linkedin: publishToLinkedIn,
  pinterest: publishToPinterest,
};
