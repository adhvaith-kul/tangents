"use client";
// A page's shareable in-app address: the in-app browser showing /news/<id>
// over the Explore screen. Closing it goes to Explore.
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ExplorePage from "@/app/explore/page";
import { closeRoute, openRoute } from "@/components/browser/open";

export default function NewsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    const n = Number(id);
    if (Number.isInteger(n) && n > 0) openRoute(n, () => router.replace("/explore"));
  }, [id, router]);

  // Only on leaving the route, so moving within the window keeps its history.
  useEffect(() => closeRoute, []);

  return <ExplorePage />;
}
