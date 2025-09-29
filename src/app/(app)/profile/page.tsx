export default function ProfilePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary-text mb-4">Profile</h1>
        <p className="text-secondary-text text-lg">Manage your account settings and preferences</p>
      </div>

      <div className="bg-secondary backdrop-blur-sm rounded-lg p-8 border border-secondary">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-semibold text-primary-text mb-4">Personal Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-secondary-text text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  className="w-full bg-secondary border border-secondary rounded-md px-3 py-2 text-primary-text placeholder-secondary-text"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-secondary-text text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  className="w-full bg-secondary border border-secondary rounded-md px-3 py-2 text-primary-text placeholder-secondary-text"
                  placeholder="your.email@example.com"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-primary-text mb-4">Interview Preferences</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-secondary-text text-sm font-medium mb-2">Default Interview Type</label>
                <select className="w-full bg-secondary border border-secondary rounded-md px-3 py-2 text-primary-text">
                  <option>Technical</option>
                  <option>Behavioral</option>
                  <option>System Design</option>
                </select>
              </div>
              <div>
                <label className="block text-secondary-text text-sm font-medium mb-2">Experience Level</label>
                <select className="w-full bg-secondary border border-secondary rounded-md px-3 py-2 text-primary-text">
                  <option>Entry Level</option>
                  <option>Mid Level</option>
                  <option>Senior Level</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-secondary">
          <button className="bg-accent hover:bg-accent/90 text-white px-6 py-2 rounded-md transition-colors">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}