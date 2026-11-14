// X's empty state: a large heading and a line of grey text in a narrow column,
// with an optional blue call to action.
import Link from "next/link";

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="mx-auto my-8 max-w-[400px] px-8">
      <div className="break-words text-[31px] font-extrabold leading-9 text-x-text">{title}</div>
      <div className="mt-2 text-[15px] leading-5 text-x-dim">{body}</div>
      {action ? (
        <Link
          href={action.href}
          className="mt-7 inline-flex h-[52px] items-center rounded-full bg-x-blue px-8 text-[17px] font-bold leading-5 text-white transition-colors hover:bg-x-blue-hover"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
