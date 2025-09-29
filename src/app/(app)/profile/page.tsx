export default function ProfilePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-theme-primary mb-4">Profile</h1>
        <p className="text-theme-secondary text-lg">Manage your account settings and preferences</p>
      </div>

      <div className="bg-theme-secondary backdrop-blur-sm rounded-lg p-8 border border-theme-secondary opacity-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-semibold text-theme-primary mb-4">Personal Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-theme-secondary text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  className="w-full bg-theme-secondary border border-theme-secondary rounded-md px-3 py-2 text-theme-primary placeholder-theme-secondary"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-theme-secondary text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  className="w-full bg-theme-secondary border border-theme-secondary rounded-md px-3 py-2 text-theme-primary placeholder-theme-secondary"
                  placeholder="your.email@example.com"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-theme-primary mb-4">Interview Preferences</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-theme-secondary text-sm font-medium mb-2">Default Interview Type</label>
                <select className="w-full bg-theme-secondary border border-theme-secondary rounded-md px-3 py-2 text-theme-primary">
                  <option>Technical</option>
                  <option>Behavioral</option>
                  <option>System Design</option>
                </select>
              </div>
              <div>
                <label className="block text-theme-secondary text-sm font-medium mb-2">Experience Level</label>
                <select className="w-full bg-theme-secondary border border-theme-secondary rounded-md px-3 py-2 text-theme-primary">
                  <option>Entry Level</option>
                  <option>Mid Level</option>
                  <option>Senior Level</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-theme-secondary">
          <button className="bg-theme-accent hover:bg-theme-accent text-white px-6 py-2 rounded-md transition-colors hover:opacity-90">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}