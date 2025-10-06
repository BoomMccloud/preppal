"use client";

import { api } from "~/trpc/react";

export default function ProfilePage() {
  const { data: profile, isLoading } = api.user.getProfile.useQuery();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-primary-text">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary-text mb-4">Profile</h1>
        <p className="text-secondary-text text-lg">Manage your account settings and preferences</p>
      </div>

      <div className="bg-secondary backdrop-blur-sm rounded-lg p-8 border border-secondary">
        <h2 className="text-2xl font-semibold text-primary-text mb-4">Personal Information</h2>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-secondary-text text-sm font-medium mb-2">Name</label>
            <input
              type="text"
              className="w-full bg-secondary border border-secondary-text rounded-md px-3 py-2 text-primary-text placeholder-secondary-text transition-colors hover:border-accent/20"
              placeholder="Your name"
              value={profile?.name ?? ""}
              readOnly
            />
          </div>
          <div>
            <label className="block text-secondary-text text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              className="w-full bg-secondary border border-secondary-text rounded-md px-3 py-2 text-primary-text placeholder-secondary-text transition-colors hover:border-accent/20"
              placeholder="your.email@example.com"
              value={profile?.email ?? ""}
              readOnly
            />
          </div>
        </div>
      </div>
    </div>
  );
}