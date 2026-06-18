import { publishToInstagram }
from "./instagram";

import { publishToFacebook }
from "./facebook";

import { publishToLinkedIn }
from "./linkedin";

export const publishers = {

  instagram:
    publishToInstagram,

  facebook:
    publishToFacebook,

  linkedin:
    publishToLinkedIn,

};