import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Development test users
  const devUsers = [
    {
      email: "dev1@preppal.com",
      name: "Dev User 1",
      emailVerified: new Date(),
    },
    {
      email: "dev2@preppal.com",
      name: "Dev User 2",
      emailVerified: new Date(),
    },
    {
      email: "dev3@preppal.com",
      name: "Dev User 3",
      emailVerified: new Date(),
    },
    {
      email: "test@example.com",
      name: "Test User",
    },
  ];

  console.log("Seeding development users...");
  const users = [];

  for (const userData of devUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData,
    });
    users.push(user);
    console.log(`✓ Created/updated user: ${user.name} (${user.email})`);
  }

  // Use the first user for the demo interview
  const user = users[0]!;

  // Create a resume for the user
  const resume = await prisma.resume.upsert({
    where: { id: "demo-resume-1" },
    update: {},
    create: {
      id: "demo-resume-1",
      userId: user.id,
      title: "Senior Frontend Developer Resume",
      content: `# John Doe
## Senior Frontend Developer

**Email:** john.doe@email.com | **Phone:** (555) 123-4567 | **Location:** San Francisco, CA

### Professional Summary
Senior Frontend Developer with 6+ years of experience building responsive web applications using React, TypeScript, and modern frontend technologies. Proven track record of delivering high-quality user experiences and leading technical initiatives.

### Technical Skills
- **Languages:** JavaScript, TypeScript, HTML5, CSS3
- **Frameworks:** React, Next.js, Vue.js
- **State Management:** Redux, Zustand, React Query
- **Styling:** Tailwind CSS, Styled Components, CSS Modules
- **Tools:** Git, Webpack, Vite, Docker
- **Testing:** Jest, React Testing Library, Vitest, Playwright

### Work Experience

**Senior Frontend Developer** | TechCorp Inc. | 2021 - Present
- Led frontend architecture redesign, improving performance by 40%
- Mentored team of 4 junior developers
- Implemented comprehensive testing strategy, achieving 85% code coverage
- Built design system used across 10+ products

**Frontend Developer** | StartupXYZ | 2019 - 2021
- Developed customer-facing dashboard using React and TypeScript
- Collaborated with design team to implement pixel-perfect UI
- Optimized bundle size, reducing initial load time by 50%

**Junior Frontend Developer** | WebAgency Co. | 2018 - 2019
- Built responsive websites for various clients
- Learned modern JavaScript frameworks and best practices

### Education
**B.S. Computer Science** | University of California | 2018`,
    },
  });

  // Create a job description for the user
  const jobDescription = await prisma.jobDescription.upsert({
    where: { id: "demo-jd-1" },
    update: {},
    create: {
      id: "demo-jd-1",
      userId: user.id,
      title: "Senior Frontend Developer",
      content: `# Senior Frontend Developer

**Company:** TechVentures Inc.
**Location:** Remote (US-based)
**Type:** Full-time

## About the Role
We are seeking a talented Senior Frontend Developer to join our growing team. You will be responsible for building and maintaining our customer-facing web applications using modern technologies.

## Responsibilities
- Design and implement new features using React and TypeScript
- Collaborate with product managers and designers to deliver exceptional user experiences
- Write clean, maintainable, and well-tested code
- Mentor junior developers and contribute to technical documentation
- Participate in code reviews and architectural discussions
- Optimize application performance and accessibility

## Requirements
- 5+ years of professional frontend development experience
- Strong proficiency in React and TypeScript
- Experience with state management libraries (Redux, Zustand, etc.)
- Solid understanding of responsive design and CSS
- Experience with testing frameworks (Jest, React Testing Library)
- Excellent communication and collaboration skills
- Bachelor's degree in Computer Science or equivalent experience

## Nice to Have
- Experience with Next.js and server-side rendering
- Knowledge of GraphQL or tRPC
- Contributions to open-source projects
- Experience with design systems

## Benefits
- Competitive salary ($150k - $180k)
- Comprehensive health insurance
- 401(k) matching
- Unlimited PTO
- Professional development budget
- Remote work flexibility`,
    },
  });

  // Create multiple test interviews with different statuses

  // 1. COMPLETED interview with feedback (original)
  const completedInterview = await prisma.interview.upsert({
    where: { id: "demo-123" },
    update: {},
    create: {
      id: "demo-123",
      userId: user.id,
      status: "COMPLETED",
      jobTitleSnapshot: "Senior Frontend Developer",
      jobDescriptionSnapshot: jobDescription.content,
      resumeSnapshot: resume.content,
      resumeId: resume.id,
      jobDescriptionId: jobDescription.id,
      startedAt: new Date(Date.now() - 3600000), // 1 hour ago
      endedAt: new Date(Date.now() - 1800000), // 30 minutes ago
      idempotencyKey: "demo-123-seed",
    },
  });

  // 2. PENDING interview (ready to start in lobby)
  await prisma.interview.upsert({
    where: { id: "demo-pending-456" },
    update: {},
    create: {
      id: "demo-pending-456",
      userId: user.id,
      status: "PENDING",
      jobTitleSnapshot: "Full Stack Engineer",
      jobDescriptionSnapshot: `We are looking for a talented Full Stack Engineer to join our team. You will work on both frontend and backend systems, building scalable web applications using modern technologies like React, Node.js, and PostgreSQL.`,
      resumeSnapshot: resume.content,
      resumeId: resume.id,
      jobDescriptionId: jobDescription.id,
      idempotencyKey: "demo-pending-456-seed",
    },
  });

  // 3. Another PENDING interview with longer description (to test truncation)
  await prisma.interview.upsert({
    where: { id: "demo-pending-789" },
    update: {},
    create: {
      id: "demo-pending-789",
      userId: user.id,
      status: "PENDING",
      jobTitleSnapshot: "Staff Software Engineer",
      jobDescriptionSnapshot: `This is a very long job description that is definitely over one hundred characters long to ensure that the truncation logic is working as expected in the lobby page. We are seeking an experienced Staff Software Engineer to lead critical technical initiatives and mentor junior team members while building scalable distributed systems.`,
      resumeSnapshot: resume.content,
      resumeId: resume.id,
      jobDescriptionId: jobDescription.id,
      idempotencyKey: "demo-pending-789-seed",
    },
  });

  // 4. IN_PROGRESS interview (should show error in lobby)
  await prisma.interview.upsert({
    where: { id: "demo-in-progress-321" },
    update: {},
    create: {
      id: "demo-in-progress-321",
      userId: user.id,
      status: "IN_PROGRESS",
      jobTitleSnapshot: "Backend Developer",
      jobDescriptionSnapshot: `Backend Developer position focused on building RESTful APIs and microservices using Node.js, Express, and PostgreSQL. Must have experience with Docker and AWS.`,
      resumeSnapshot: resume.content,
      resumeId: resume.id,
      jobDescriptionId: jobDescription.id,
      startedAt: new Date(),
      idempotencyKey: "demo-in-progress-321-seed",
    },
  });

  // 5. ERROR interview (should show error in lobby)
  await prisma.interview.upsert({
    where: { id: "demo-error-654" },
    update: {},
    create: {
      id: "demo-error-654",
      userId: user.id,
      status: "ERROR",
      jobTitleSnapshot: "DevOps Engineer",
      jobDescriptionSnapshot: `DevOps Engineer role requiring expertise in CI/CD pipelines, Kubernetes, and cloud infrastructure management.`,
      resumeSnapshot: resume.content,
      resumeId: resume.id,
      jobDescriptionId: jobDescription.id,
      startedAt: new Date(Date.now() - 600000), // 10 minutes ago
      idempotencyKey: "demo-error-654-seed",
    },
  });

  const interview = completedInterview; // Keep reference for feedback creation below

  // Create transcript entries for the interview
  const transcriptEntries = [
    {
      speaker: "AI",
      content: "Hello! Welcome to your interview for the Senior Frontend Developer position at TechVentures Inc. I'm excited to learn more about your experience. Let's start with an introduction - can you tell me about your background and what interests you about this role?",
      timestamp: new Date(Date.now() - 3600000), // Start of interview
    },
    {
      speaker: "USER",
      content: "Hi! Thanks for having me. I'm a Senior Frontend Developer with over 6 years of experience. I've been working primarily with React and TypeScript, and I'm really passionate about building user-friendly, performant web applications. What attracted me to this role is the opportunity to work on challenging problems with modern technologies and the chance to mentor other developers.",
      timestamp: new Date(Date.now() - 3540000),
    },
    {
      speaker: "AI",
      content: "That's great to hear! I noticed in your resume that you led a frontend architecture redesign that improved performance by 40%. Can you walk me through that project? What were the main challenges you faced and how did you approach them?",
      timestamp: new Date(Date.now() - 3480000),
    },
    {
      speaker: "USER",
      content: "Sure! The main challenge was that our application had grown organically over time, and we had accumulated a lot of technical debt. Bundle sizes were huge, we had unnecessary re-renders, and the code was difficult to maintain. I started by doing a thorough audit using tools like Lighthouse and React DevTools Profiler. Then I created a roadmap with the team to address issues incrementally - we implemented code splitting, migrated to React Query for data fetching, and introduced memoization where needed. The key was making sure we didn't disrupt ongoing development while making these improvements.",
      timestamp: new Date(Date.now() - 3420000),
    },
    {
      speaker: "AI",
      content: "Excellent approach! Now let's dive into a technical question. Can you explain the difference between server-side rendering and client-side rendering, and when you might choose one over the other?",
      timestamp: new Date(Date.now() - 3300000),
    },
    {
      speaker: "USER",
      content: "Great question. Client-side rendering is when JavaScript runs in the browser to render the page. This is typical in traditional React apps - you get a minimal HTML shell, then JavaScript builds the UI. It's great for highly interactive applications but can have slower initial load times and SEO challenges. Server-side rendering generates the full HTML on the server, sending complete pages to the browser. This is faster for initial page loads and better for SEO. With Next.js, we can actually use both - SSR for initial loads and then hydrate to a fully interactive client-side app. I'd choose SSR for content-heavy sites where SEO matters, and CSR for dashboard-type applications where SEO is less critical.",
      timestamp: new Date(Date.now() - 3240000),
    },
    {
      speaker: "AI",
      content: "Perfect explanation! Let's do a quick coding exercise. Can you write a custom React hook that debounces a value? For example, if I'm typing in a search box, I want to wait until the user stops typing before making an API call.",
      timestamp: new Date(Date.now() - 3120000),
    },
    {
      speaker: "USER",
      content: "Absolutely! Here's how I'd implement that:\n\nfunction useDebounce(value, delay) {\n  const [debouncedValue, setDebouncedValue] = useState(value);\n  \n  useEffect(() => {\n    const handler = setTimeout(() => {\n      setDebouncedValue(value);\n    }, delay);\n    \n    return () => {\n      clearTimeout(handler);\n    };\n  }, [value, delay]);\n  \n  return debouncedValue;\n}\n\nThe key is using useEffect with the value as a dependency, setting a timeout to update the debounced value, and cleaning up the timeout on each render. This way, if the value changes before the delay expires, we cancel the previous timeout and start a new one.",
      timestamp: new Date(Date.now() - 3000000),
    },
    {
      speaker: "AI",
      content: "Excellent implementation! You correctly handled the cleanup function to prevent memory leaks. Before we wrap up, do you have any questions about the role or the team?",
      timestamp: new Date(Date.now() - 2880000),
    },
    {
      speaker: "USER",
      content: "Yes, I'd love to know more about the team structure. How large is the frontend team, and what does collaboration look like between frontend, backend, and design?",
      timestamp: new Date(Date.now() - 2820000),
    },
    {
      speaker: "AI",
      content: "Great question! Our frontend team has 8 engineers, and we work very closely with 4 backend engineers and 2 designers. We do weekly syncs between all teams, and we use pair programming for complex features. The team really values collaboration and knowledge sharing. Well, that wraps up our interview today! Thank you so much for your time. We'll be in touch soon with next steps.",
      timestamp: new Date(Date.now() - 2760000),
    },
    {
      speaker: "USER",
      content: "Thank you so much! I really enjoyed our conversation and I'm excited about the opportunity. Looking forward to hearing from you!",
      timestamp: new Date(Date.now() - 1800000), // End of interview
    },
  ];

  for (const entry of transcriptEntries) {
    await prisma.transcriptEntry.create({
      data: {
        interviewId: interview.id,
        speaker: entry.speaker as "USER" | "AI",
        content: entry.content,
        timestamp: entry.timestamp,
      },
    });
  }

  // Create feedback for the interview
  await prisma.interviewFeedback.upsert({
    where: { interviewId: interview.id },
    update: {},
    create: {
      interviewId: interview.id,
      summary: "The candidate demonstrated strong technical skills and problem-solving abilities. They showed good understanding of React concepts and were able to implement clean, readable code. Communication was clear and they explained their thought process well throughout the interview.",
      strengths: `• **Strong React Knowledge**: Demonstrated deep understanding of React hooks, state management, and component lifecycle
• **Clean Code**: Wrote well-structured, readable code with proper naming conventions
• **Problem-Solving**: Approached problems methodically and considered edge cases
• **Communication**: Clearly explained thought process and asked clarifying questions when needed
• **Time Management**: Completed tasks efficiently within the given timeframe`,
      contentAndStructure: `The candidate showed excellent understanding of component architecture and data flow. They properly structured their React components with clear separation of concerns and implemented appropriate state management patterns.

**Strengths:**
- Used proper component composition
- Implemented correct prop passing and state lifting
- Demonstrated understanding of when to use different hooks
- Good understanding of component lifecycle

**Areas for improvement:**
- Could have discussed more advanced optimization techniques like memoization
- Missed opportunity to talk about accessibility considerations
- Could have explored more complex state management patterns`,
      communicationAndDelivery: `The candidate communicated effectively throughout the interview. They spoke clearly, maintained good pace, and engaged well with the interviewer.

**Strengths:**
- Clear and articulate explanations
- Good use of technical vocabulary
- Asked thoughtful clarifying questions
- Maintained professional demeanor

**Areas for improvement:**
- Could have been more confident when explaining complex concepts
- Sometimes hesitated before answering, could work on reducing uncertainty
- Could benefit from providing more concrete examples when explaining concepts`,
      presentation: `The candidate presented themselves professionally and maintained good engagement throughout the session.

**Strengths:**
- Maintained good eye contact (when camera was on)
- Professional appearance and setup
- Good posture and body language
- Engaged actively with the interviewer

**Areas for improvement:**
- Could have used more gestures to emphasize points
- Screen sharing setup could be improved for better visibility
- Could have prepared a more organized workspace for coding demonstrations`,
    },
  });

  console.log("\n✅ Seed data created successfully!");
  console.log("\n📧 Test user: ${user.email}");
  console.log("\n📝 Interviews created:");
  console.log("  • demo-123 (COMPLETED) - Senior Frontend Developer");
  console.log("  • demo-pending-456 (PENDING) - Full Stack Engineer");
  console.log("  • demo-pending-789 (PENDING) - Staff Software Engineer (long description)");
  console.log("  • demo-in-progress-321 (IN_PROGRESS) - Backend Developer");
  console.log("  • demo-error-654 (ERROR) - DevOps Engineer");
  console.log(`\n📄 Test resume: ${resume.id}`);
  console.log(`📋 Test job description: ${jobDescription.id}`);
  console.log(`💬 Transcript entries: ${transcriptEntries.length}`);
  console.log("\n🌐 Try these URLs:");
  console.log("  • /interview/demo-123/lobby → redirects to feedback (COMPLETED)");
  console.log("  • /interview/demo-123/feedback → view feedback");
  console.log("  • /interview/demo-pending-456/lobby → shows lobby (PENDING)");
  console.log("  • /interview/demo-pending-789/lobby → shows lobby with truncation");
  console.log("  • /interview/demo-in-progress-321/lobby → shows error (IN_PROGRESS)");
  console.log("  • /interview/demo-error-654/lobby → shows error (ERROR)");
  console.log("  • /interview/invalid-id/lobby → shows NOT_FOUND error\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });