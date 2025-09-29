type AIAvatarProps = {
  status: string;
};

export function AIAvatar({ status }: AIAvatarProps) {
  return (
    <div className="px-8 flex items-center justify-center py-8">
      <div className="bg-secondary/30 backdrop-blur-sm rounded-2xl relative overflow-hidden mx-auto border border-secondary-text/10" style={{width: '768px', aspectRatio: '16/9'}}>
        {/* Video Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 bg-accent rounded-full flex items-center justify-center mb-4 mx-auto shadow-2xl">
              <svg className="w-16 h-16 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-primary-text text-xl font-medium mb-1">AI Interviewer</h3>
            <p className="text-secondary-text">{status}</p>
          </div>
        </div>

        {/* Recording Indicator */}
        <div className="absolute top-4 left-4 flex items-center space-x-2 bg-secondary/50 backdrop-blur-sm rounded-full px-3 py-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-primary-text text-xs">Recording</span>
        </div>
      </div>
    </div>
  );
}
