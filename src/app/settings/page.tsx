// Settings: the list of categories, with search and the modes. Each category
// has its own page at /settings/<category>.
import { Shell } from "@/components/Shell";
import { SettingsHome } from "@/components/settings/SettingsHome";

export default function SettingsPage() {
  return (
    <Shell title="Settings">
      <SettingsHome />
    </Shell>
  );
}
