# Arabic Writing Platform Cost Estimate

Date: 16 May 2026

Currency note: estimates are shown in OMR and USD. Conversion used: **1 OMR ≈ 2.60 USD**.

## 1. Cost Summary

For the current platform scope, a reasonable development cost is:

| Option | Estimated Cost |
|---|---:|
| Basic deployment and cleanup of existing platform | **1,200-2,000 OMR** / **3,120-5,200 USD** |
| Full current platform value, as a custom web app | **4,000-7,500 OMR** / **10,400-19,500 USD** |
| Production-ready version with extra testing, polish, security review, and documentation | **7,500-12,000 OMR** / **19,500-31,200 USD** |

Recommended practical quote for this platform:

**5,500 OMR**  
Approx. **14,300 USD**

This price fits the current system because it includes student features, teacher/admin features, Supabase integration, lesson content, rubrics, AI evaluation support, progress tracking, and semester organization.

## 2. Included Platform Features

This estimate covers:

- Student login and protected routes
- Teacher/admin login and role-based access
- Semester 1 and Semester 2 lesson organization
- Arabic writing lessons with goals, steps, models, prompts, review questions, and evaluation tasks
- Topic cards and lesson pages
- Student writing submission flow
- AI-supported evaluation flow
- Rubric-based assessment
- Teacher submission review
- Teacher lesson visibility controls
- User management and CSV upload
- Student progress and points system
- Activity submissions
- Collaborative and dialogue activities
- Chat center
- Responsive interface styling
- Supabase database/auth integration
- Production build setup

## 3. Development Cost Breakdown

| Work Area | Estimated Hours | Estimated Cost |
|---|---:|---:|
| Planning, requirements, and app structure | 10-16 hrs | 80-190 OMR |
| Authentication and role-based routing | 18-28 hrs | 145-335 OMR |
| Student lesson and topics experience | 45-70 hrs | 360-840 OMR |
| Interactive activities and collaboration tools | 45-75 hrs | 360-900 OMR |
| Writing submission and evaluation flow | 40-65 hrs | 320-780 OMR |
| Rubrics and AI evaluation integration | 35-60 hrs | 280-720 OMR |
| Teacher/admin panel | 45-75 hrs | 360-900 OMR |
| Supabase schema, tracking, and functions | 50-80 hrs | 400-960 OMR |
| Semester content integration | 30-55 hrs | 240-660 OMR |
| UI polish and responsive layout | 30-50 hrs | 240-600 OMR |
| Testing, fixes, deployment, and documentation | 25-45 hrs | 200-540 OMR |

Estimated subtotal:

**2,985-7,425 OMR**

With project management, revisions, and contingency:

**4,000-7,500 OMR**

## 4. Monthly Running Cost

The platform can run at low cost for a small school or pilot, but production use should use paid backend hosting.

| Item | Pilot Cost | Production Cost |
|---|---:|---:|
| Frontend hosting | 0 OMR | 0-8 OMR/month |
| Supabase backend | 0 OMR | about 10 OMR/month |
| Domain name | 4-8 OMR/year | 4-8 OMR/year |
| Email/SMTP service | 0-4 OMR/month | 4-15 OMR/month |
| AI evaluation usage | variable | 5-50+ OMR/month |
| Monitoring/backups/tools | 0-5 OMR/month | 5-25 OMR/month |

Estimated monthly infrastructure:

- Pilot: **0-20 OMR/month**
- Small production school: **25-90 OMR/month**
- Medium usage: **80-250 OMR/month**

Maintenance is separate from hosting:

- Basic maintenance: **150-250 OMR/month**
- Active support and improvements: **300-600 OMR/month**
- High-support school deployment: **600-1,000 OMR/month**

## 5. Suggested Client Pricing

### Package A: Setup Existing Platform

**1,500 OMR**

Includes:

- Configure environment variables
- Connect Supabase project
- Deploy frontend
- Confirm login, lessons, submissions, and teacher panel
- Basic bug fixing

Best for: using the current code with minimal changes.

### Package B: Full School Platform

**5,500 OMR**

Includes:

- Full platform setup
- Semester 1 and Semester 2 content
- Teacher/admin management
- Student progress tracking
- Rubric evaluation
- AI evaluation configuration
- Deployment
- Documentation
- 2 rounds of revisions

Best for: presenting this as a complete custom Arabic writing platform.

### Package C: Production Plus

**9,500 OMR**

Includes everything in Package B, plus:

- Extra UI polish
- Security review
- Database cleanup and backup strategy
- Better reporting dashboard
- More testing
- Training documentation
- 1 month of post-launch support

Best for: school or organization deployment.

## 6. Recommended Price

For this platform, the recommended price is:

**5,500 OMR**

Optional monthly support:

**250 OMR/month**

Estimated external services:

**25-90 OMR/month**, depending on student count and AI usage.

## 7. Notes And Assumptions

This estimate assumes:

- The platform remains a web app, not a native mobile app.
- Supabase continues to be used for authentication, database, and storage.
- AI evaluation is optional and billed separately through the selected AI provider.
- The client provides lesson materials, images, and final educational approval.
- Large-scale enterprise requirements such as SSO, audit compliance, advanced analytics, and dedicated SLAs are not included.

## 8. Pricing Sources Checked

- Supabase pricing: https://supabase.com/pricing
- Vercel pricing: https://vercel.com/pricing
- Netlify pricing: https://www.netlify.com/pricing/

