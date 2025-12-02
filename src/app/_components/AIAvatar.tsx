type AIAvatarProps = {
  status: string;
};

export function AIAvatar({ status }: AIAvatarProps) {
  return (
    <div className="flex items-center justify-center px-8 py-8">
      <div className="bg-secondary/30 border-secondary-text/10 relative mx-auto aspect-video w-[768px] overflow-hidden rounded-2xl border backdrop-blur-sm">
        {/* Video Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="bg-accent mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-full shadow-2xl">
              <svg
                className="text-primary h-16 w-16"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h3 className="text-primary-text mb-1 text-xl font-medium">
              AI Interviewer
            </h3>
            <p className="text-secondary-text">{status}</p>
          </div>
        </div>

        {/* Recording Indicator */}
        <div className="bg-secondary/50 absolute top-4 left-4 flex items-center space-x-2 rounded-full px-3 py-2 backdrop-blur-sm">
          <div className="bg-accent h-2 w-2 animate-pulse rounded-full"></div>
          <span className="text-primary-text text-xs">Recording</span>
        </div>
      </div>
    </div>
  );
}
