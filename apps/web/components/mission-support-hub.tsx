import { LiveStrategies } from "./live-strategies";
import type { MissionEntry } from "./live-workspace";
export function MissionSupportHub({ entry }: { entry?: MissionEntry }) {
 return <LiveStrategies entries={entry?[entry]:[]} initialMissionId={entry?.mission.id} initialVersionId={(entry?.mission.draftVersion??entry?.mission.publishedVersion)?.id}/>;
}
