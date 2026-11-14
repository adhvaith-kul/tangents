"use client";
// Home: "For you" / "Following" tabs, the composer, then the timeline.
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Composer } from "@/components/core/Composer";
import { HomeTimeline, type FeedTab } from "@/components/core/HomeTimeline";
import { Tabs } from "@/components/core/Tabs";
import { bus } from "@/lib/client";

const TABS: { key: FeedTab; label: string }[] = [
  { key: "foryou", label: "For you" },
  { key: "following", label: "Following" },
];

export default function Home() {
  const [tab, setTab] = useState<FeedTab>("foryou");
  const [epoch, setEpoch] = useState(0); // bumped to reload after a simulation control

  useEffect(() => {
    const off = bus.on("sim", () => setEpoch((n) => n + 1));
    return () => {
      off();
    };
  }, []);

  const select = (key: FeedTab) => {
    window.scrollTo({ top: 0 });
    setTab(key);
  };

  return (
    <Shell header={<Tabs tabs={TABS} active={tab} onSelect={select} />}>
      <Composer variant="home" />
      <HomeTimeline key={`${tab}-${epoch}`} tab={tab} />
    </Shell>
  );
}
