// Bundled fallback headlines, used only when no live feed can be fetched.
// Plausible, evergreen premises about public personas and business, entertainment
// or political theatre. Subject to the same content limits as the live filter.
import type { Domain } from "./types";

export interface Premise {
  domain: Domain;
  title: string;
}

export const PREMISES: Premise[] = [
  // tech and business
  { domain: "tech", title: "Nvidia unveils next-generation AI chips as Jensen Huang promises demand will outrun supply" },
  { domain: "tech", title: "Tesla shareholders push back on Elon Musk's latest pay proposal ahead of annual meeting" },
  { domain: "tech", title: "Sam Altman teases a new OpenAI model, rivals say the demo was heavily rehearsed" },
  { domain: "tech", title: "Meta shows off smart glasses at its developer event, Zuckerberg's live demo glitches on stage" },
  { domain: "tech", title: "Amazon and Blue Origin announce launch partnership as Jeff Bezos tours the new facility" },
  { domain: "tech", title: "Mark Cuban offers to publicly bet against a startup's valuation after its funding round" },
  { domain: "tech", title: "Bill Ackman posts a 4,000-word thread defending his latest stock pick, shares barely move" },
  { domain: "tech", title: "Big Tech earnings week: investors brace for AI spending guidance from Microsoft, Meta and Amazon" },
  // pop
  { domain: "pop", title: "Taylor Swift teases a surprise announcement, fans decode a new batch of clues" },
  { domain: "pop", title: "Kim Kardashian's SKIMS unveils holiday collection with a celebrity-packed campaign" },
  { domain: "pop", title: "Rihanna's Fenty Beauty launches a limited collaboration with a luxury fashion house" },
  { domain: "pop", title: "Timothée Chalamet draws huge crowds at a red carpet premiere in New York" },
  { domain: "pop", title: "Drake and Cardi B trade playful jabs online ahead of a rumoured collaboration" },
  { domain: "pop", title: "Kylie Jenner debuts a new makeup line, reviewers split on the packaging" },
  { domain: "pop", title: "Vogue's annual fashion gala guest list leaks, stylists scramble over who is wearing what" },
  // politics
  { domain: "politics", title: "Trump and Newsom trade barbs over California funding ahead of a Senate budget hearing" },
  { domain: "politics", title: "JD Vance headlines a rally in Ohio, takes aim at Silicon Valley donors" },
  { domain: "politics", title: "Alexandria Ocasio-Cortez grills a bank executive at a House Financial Services hearing" },
  { domain: "politics", title: "Gavin Newsom launches a podcast tour, Washington wonders what it means for 2028" },
  // crossover
  { domain: "crossover", title: "Elon Musk and Donald Trump appear together at a business roundtable, cameras catch an awkward moment" },
  { domain: "crossover", title: "Taylor Swift and Jeff Bezos spotted at the same charity auction, bidding war goes viral" },
];
