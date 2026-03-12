import TaskBoard from '../tasks/TaskBoard';

interface TasksTabProps {
  patientId: number;
  episodeId?: number | null;
  tplPhaseId?: number | null;
}

export default function TasksTab({ patientId, episodeId = null, tplPhaseId = null }: TasksTabProps) {
  return (
    <TaskBoard
      declaredContextType="PATIENT"
      criteria={{
        patientId,
        episodeId,
        tplPhaseId,
      }}
    />
  );
}
