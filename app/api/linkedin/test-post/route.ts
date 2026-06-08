import { publishToLinkedIn }
from "@/lib/publishers/linkedin";

export async function GET() {

  const result =
    await publishToLinkedIn(
      "AQVVwN1rWq5EOzp5L23dBuU4s_edkKG6gSlcq6KfhEc-CppIt60dD17oWTcKR17SdS6BX65QQmQq02x8bGyVG7mub99zpuigcVlgFDlvPzBvCpIOQdME0uA8jJduB_NOPcCIhl56MEi920vTYWuNF7XCxhDXbqyBq_GvwqJwBTmabE7gXQ_aXDbGRqbhlJNA5b5gGPndRse-DJ-ny6wJARxM6mZG30MfFIjwA6z7Q4eM9xu6ucPtnrQsi4ks9s81QrNPklhijP5FV4locaAbbqObqLp_XxSVhzxPyETV7Tikufb-am4xzxaCPgntH_TCpTVJIjFQoPQ7Zy00pLd35_2586TrCQ",
      "dIVAfe12WK",
      "🚀 Test post from Dizito Scheduler"
    );

  return Response.json(result);
}