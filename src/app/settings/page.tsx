// Settings: the user tunes the content of their world.
import { Shell } from "@/components/Shell";
import { SettingsView } from "@/components/settings/SettingsView";

export default function SettingsPage() {
  return (
    <Shell title="Settings">
      <SettingsView />
    </Shell>
  );
}
