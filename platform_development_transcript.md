# Arabic Writing Platform Development Transcript

## Opening

Hello, today I will present the development of the Arabic Writing Platform. This platform was created to help students learn Arabic writing skills through structured lessons, interactive practice, writing tasks, teacher feedback, and progress tracking.

The main goal of the platform is to support Arabic language learning in a practical way. Instead of only reading lesson content, students can study a topic, review key ideas, complete activities, submit writing tasks, and receive evaluation from the teacher.

## Project Overview

The platform is a web application built with React, TypeScript, and Vite. It uses Supabase for authentication, user profiles, submissions, lesson visibility settings, and tracking student progress.

The system supports three main user roles:

1. Student
2. Teacher
3. Admin

Students use the platform to access lessons, complete activities, submit writing tasks, and view their progress. Teachers and admins use the teacher panel to manage users, control lesson availability, review submissions, and monitor student work.

## Main Development Stages

The first stage of development was building the application structure. The app uses React Router to manage pages such as the topics page, lesson page, lesson review, activity pages, evaluation page, teacher panel, submissions pages, student progress page, profile page, and chat center.

The second stage was adding authentication and role-based access. Supabase authentication is used to identify users, and each user profile stores the role. Protected routes make sure that students, teachers, and admins only access the pages that match their permissions.

The third stage was building the lesson system. Each lesson is stored as structured data. A topic includes the title, description, lesson goals, introduction, lesson steps, writing model, activities, writing prompts, review questions, writing sections, and an evaluation task.

The fourth stage was building the evaluation system. Rubrics are connected to each topic so that teachers can assess student writing using clear criteria. The rubrics include levels such as excellent, very good, good, and weak, with score values and descriptions.

The fifth stage was adding progress and gamification. The platform tracks completed lessons, activities, evaluations, collaborative activities, and points. Students can see their progress and current point level from the topics page and progress dashboard.

## Semester Structure

The platform content is now separated into two semesters.

Semester 1 includes the original topics:

1. وصف منظر طبيعي
2. مناقشة قضية
3. كيفية كتابة التقرير
4. التعبير الحر
5. النص الحواري

Semester 2 includes the new topics:

1. كتابة الفقرة
2. تصميم موضوع
3. التلخيص
4. ترجمة علم
5. كيفية عرض كتاب
6. حكاية قصة

To make the structure cleaner, the lesson content was split into separate data files. Semester 1 topics are stored in `semester1Topics.ts`, Semester 2 topics are stored in `semester2Topics.ts`, and `topics.ts` exports both semester groups and one combined topic list for the rest of the application.

This approach keeps the old content safe while allowing new semester content to be added without replacing existing lessons.

## Student Experience

When a student logs in, they are taken to the topics page. The topics are displayed in separate sections for Semester 1 and Semester 2. Each topic card shows the lesson title, short description, progress status, and a button to open the lesson.

Inside a lesson, the student can read the introduction, review lesson goals, follow the lesson steps, study the writing model, and continue to review or evaluation sections depending on teacher settings.

The student can also complete interactive activities and submit writing tasks. These submissions are saved so that teachers can review them later.

## Teacher Experience

Teachers and admins are directed to the teacher panel. From this panel, they can manage users, upload users from a CSV file, add individual students, and control which parts of each lesson are available.

The lesson visibility panel is also split by semester. This helps teachers manage Semester 1 and Semester 2 lessons more clearly. For each topic, the teacher can enable or disable sections such as the lesson, video, review, writing and evaluation, and activities.

Teachers can also open submission pages to review student writing and use the rubrics to provide structured feedback.

## Data And Code Organization

The topic data is organized in a reusable structure. The main `Topic` type defines all required lesson fields, and each semester file provides a list of topics.

The rubrics are stored separately in `rubrics.ts`. Each rubric is linked to a topic by `topicId`, which allows the evaluation page and submission review page to find the correct rubric automatically.

The page components use this shared data instead of hardcoding lesson content inside the UI. This makes the platform easier to maintain, because new lessons can be added by updating the data files.

## Recent Development Work

The most recent development update focused on adding Semester 2 content while preserving Semester 1.

The original topics were restored and moved into a Semester 1 data file. The new Semester 2 lessons were added in a separate file. The main topics export was updated so that all lessons still work with existing routes, tracking, submissions, and teacher settings.

The student topics page was updated to show two sections: one for Semester 1 and one for Semester 2. The teacher panel was also updated so teachers can manage lesson visibility by semester.

The rubrics file was merged so both Semester 1 and Semester 2 topics have evaluation criteria.

Finally, the project was built successfully using `npm.cmd run build`, confirming that the TypeScript and Vite production build completed correctly.

## Technical Stack

The platform uses:

1. React for the user interface
2. TypeScript for safer code and clearer data types
3. Vite for development and production builds
4. React Router for navigation
5. Supabase for authentication, profiles, submissions, and database features
6. CSS files for custom styling and responsive layouts

## Conclusion

In conclusion, the Arabic Writing Platform is designed as a complete learning environment for Arabic writing. It combines lessons, activities, writing tasks, teacher review, rubrics, and progress tracking in one system.

The new semester structure makes the platform easier to expand. Semester 1 content remains available, and Semester 2 content has been added in a clean and organized way. This gives students a clearer learning path and gives teachers better control over lesson delivery.
