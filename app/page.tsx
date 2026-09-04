import type { Metadata } from "next";
import { GraphShieldApp } from "./GraphShieldApp";

export const metadata: Metadata = {
  title: "GraphShield | Explainable graph investigations",
  description: "A guided graph analytics workbench for fraud investigators.",
};

export default function Home() {
  return <GraphShieldApp />;
}
