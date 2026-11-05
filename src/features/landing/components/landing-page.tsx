import { SiteHeader } from "./site-header";
import { Hero } from "./landing-hero";
import { LedgerStrip,Services } from "./landing-services";
import { ByQueElegirnos,ContamosWith,MisionVision,RegulatoryStrip } from "./landing-trust";
import { SiteFooter } from "./site-footer";

export function LandingPage() {
  return (
    <div className="bg-white text-black-700">
      <SiteHeader />
      <Hero />
      <LedgerStrip />
      <Services />
      <ContamosWith />
      <MisionVision />
      <ByQueElegirnos />
      <RegulatoryStrip />
      <SiteFooter />
    </div>
  );
}
