type InterviewHeaderProps = {
  title: string;
  interviewId: string;
  timer: string;
};

export function InterviewHeader({ title, interviewId, timer }: InterviewHeaderProps) {
  return (
    <div className="px-8 py-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-medium text-primary-text mb-1">{title}</h1>
          <span className="text-secondary-text text-sm">ID: {interviewId}</span>
        </div>
        <div className="bg-secondary/30 rounded-lg px-4 py-2">
          <div className="text-secondary-text text-xs">Total Time</div>
          <div className="text-primary-text font-mono text-lg">{timer}</div>
        </div>
      </div>
    </div>
  );
}
