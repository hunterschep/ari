import Link from "next/link";
import { Badge, Card, CardContent, Table, Td, Th } from "@ari/ui";
import type { CanonicalListing, ListingScore, PricingAdvice } from "@ari/schemas";

export function ListingTable({
  results
}: {
  results: Array<{ listing: CanonicalListing; score: ListingScore; pricingAdvice: PricingAdvice }>;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <thead>
            <tr>
              <Th>Unit</Th>
              <Th>Fit</Th>
              <Th>Price</Th>
              <Th>Notes</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {results.map(({ listing, score, pricingAdvice }) => (
              <tr key={listing.id} className="hover:bg-zinc-50">
                <Td>
                  <div className="flex items-center gap-3">
                    <img src={listing.media.photos[0] ?? "/images/listing-living.svg"} alt="" className="h-14 w-20 rounded-md border border-zinc-200 object-cover" />
                    <div>
                      <div className="font-medium text-zinc-950">{listing.title ?? listing.address.raw}</div>
                      <div className="text-xs text-zinc-500">{listing.address.raw}{listing.address.unit ? `, ${listing.address.unit}` : ""}</div>
                    </div>
                  </div>
                </Td>
                <Td>
                  <div className="font-medium">{score.totalScore}/100</div>
                  <Badge tone={score.recommendation === "CONTACT_NOW" ? "green" : score.recommendation === "SKIP" ? "red" : "neutral"}>
                    {score.recommendation.replaceAll("_", " ")}
                  </Badge>
                </Td>
                <Td>
                  <div className="font-medium">${listing.price.toLocaleString()}</div>
                  <div className="text-xs text-zinc-500">{pricingAdvice.verdict.replaceAll("_", " ").toLowerCase()}</div>
                </Td>
                <Td>
                  <div className="max-w-sm text-sm text-zinc-700">{score.explanation?.summary}</div>
                  {pricingAdvice.warnings[0] ? <div className="mt-1 text-xs text-red-700">{pricingAdvice.warnings[0]}</div> : null}
                </Td>
                <Td className="text-right">
                  <Link className="inline-flex h-8 items-center rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-medium hover:bg-zinc-50" href={`/listings/${listing.id}`}>
                    Open
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </CardContent>
    </Card>
  );
}
