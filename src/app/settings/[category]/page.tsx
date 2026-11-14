"use client";
// One Settings category. /settings/<category>?focus=<control> scrolls to a
// control and marks it, which is how a search result lands here.
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/icons";
import { SettingsCategory } from "@/components/settings/SettingsCategory";
import { CATEGORIES, isCategory } from "@/components/settings/model";

/** X's detail header: a back arrow to the list, then the category's name. */
function Header({ title }: { title: string }) {
  return (
    <div className="flex h-[53px] items-center px-4">
      <div className="min-w-[56px]">
        <Link
          href="/settings"
          aria-label="Back to Settings"
          className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-x-text transition-colors hover:bg-x-hover focus-visible:outline-2 focus-visible:outline-x-blue"
        >
          <Icon name="back" size={20} />
        </Link>
      </div>
      <h2 className="min-w-0 flex-1 truncate text-xl font-bold leading-6 text-x-text">{title}</h2>
    </div>
  );
}

function Category() {
  const { category } = useParams<{ category: string }>();
  const focus = useSearchParams().get("focus");
  if (!isCategory(category)) {
    return (
      <Shell header={<Header title="Settings" />}>
        <div className="px-8 py-10 text-center">
          <div className="text-[31px] font-extrabold leading-9 text-x-text">This setting doesn’t exist</div>
          <div className="mt-2 text-[15px] leading-5 text-x-dim">
            Go back to <Link href="/settings" className="text-x-blue hover:underline">Settings</Link> and pick a category.
          </div>
        </div>
      </Shell>
    );
  }
  const title = CATEGORIES.find((c) => c.id === category)!.title;
  return (
    <Shell header={<Header title={title} />}>
      <SettingsCategory id={category} focus={focus} />
    </Shell>
  );
}

export default function SettingsCategoryPage() {
  return (
    <Suspense fallback={null}>
      <Category />
    </Suspense>
  );
}
