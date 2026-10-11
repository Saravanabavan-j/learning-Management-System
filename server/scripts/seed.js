import 'dotenv/config';
import { query, pool } from '../config/db.js';

try {
  const admins = await query("SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1");
  if (!admins.length) {
    console.error('Create an admin first, then run: npm run seed');
    process.exitCode = 1;
  } else {
    const adminId = admins[0].id;
    const courses = [
      ['JavaScript Foundations', 'Build a strong foundation in modern JavaScript: variables, functions, arrays, objects, and asynchronous code.', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80', 'Programming', 'beginner'],
      ['React for Beginners', 'Learn components, props, state, effects, and how to build responsive interfaces with React.', 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=1200&q=80', 'Programming', 'intermediate'],
      ['SQL & Database Essentials', 'Understand relational databases, joins, grouping, constraints, and writing useful SQL queries.', 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=1200&q=80', 'Data', 'beginner'],
      ['UX Design Fundamentals', 'Learn the principles of user-centred design, wireframing, prototyping, and usability testing.', 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=80', 'Design', 'beginner'],
      ['Advanced Python', 'Deep dive into Python decorators, generators, async/await, type hints, and packaging.', 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=1200&q=80', 'Programming', 'advanced']
    ];
    for (const [title, description, thumbnail, category, difficulty] of courses) {
      await query('INSERT INTO courses(title,description,thumbnail_url,instructor_id,published,category,difficulty) SELECT :title,:description,:thumbnail,:admin,1,:category,:difficulty WHERE NOT EXISTS (SELECT 1 FROM courses WHERE title=:title)',
        { title, description, thumbnail, admin: adminId, category, difficulty });
    }

    const lessonSeeds = [
      ['JavaScript Foundations', 'Variables and data types', 'Learn let, const, strings, numbers, booleans, null, and undefined. Try declaring a variable and logging its type.', 1],
      ['JavaScript Foundations', 'Functions and scope', 'Functions package reusable logic. Practice function declarations, parameters, return values, and block scope.', 2],
      ['JavaScript Foundations', 'Arrays and objects', 'Arrays hold ordered data; objects hold key-value pairs. Learn to iterate, destructure, and transform them.', 3],
      ['React for Beginners', 'Your first React component', 'A React component is a JavaScript function that returns UI. Create a component, render it, and pass it a prop.', 1],
      ['React for Beginners', 'State and effects', 'useState manages local state; useEffect handles side-effects like data fetching. Build a counter and a data-loader.', 2],
      ['SQL & Database Essentials', 'Introduction to SQL', 'SQL is the language of relational databases. Learn SELECT, FROM, WHERE, ORDER BY, and LIMIT.', 1],
      ['SQL & Database Essentials', 'Joins and relationships', 'Combine data from multiple tables using INNER JOIN, LEFT JOIN, and understand primary and foreign keys.', 2]
    ];
    for (const [courseTitle, title, content, position] of lessonSeeds) {
      await query('INSERT INTO lessons(course_id,title,content,position) SELECT c.id,:title,:content,:position FROM courses c WHERE c.title=:course AND NOT EXISTS (SELECT 1 FROM lessons l WHERE l.course_id=c.id AND l.title=:title)',
        { course: courseTitle, title, content, position });
    }

    const assignmentSeeds = [
      ['JavaScript Foundations', 'JavaScript practice', 'Write a function that accepts an array of numbers and returns the largest value. Include a few test cases.', 14],
      ['React for Beginners', 'React component exercise', 'Create a reusable course card component that accepts a title, description, and instructor as props.', 21]
    ];
    for (const [courseTitle, title, instructions, days] of assignmentSeeds) {
      await query(`INSERT INTO assignments(course_id,title,instructions,due_date,max_score) SELECT c.id,:title,:instructions,datetime('now', :offset),100 FROM courses c WHERE c.title=:course AND NOT EXISTS (SELECT 1 FROM assignments a WHERE a.course_id=c.id AND a.title=:title)`,
        { course: courseTitle, title, instructions, offset: `+${days} days` });
    }

    // Seed quizzes
    const jsFoundationsId = await query('SELECT id FROM courses WHERE title=:t LIMIT 1', { t: 'JavaScript Foundations' });
    if (jsFoundationsId.length) {
      const cId = jsFoundationsId[0].id;
      const existingQuiz = await query('SELECT id FROM quizzes WHERE course_id=:c AND title=:t LIMIT 1', { c: cId, t: 'JavaScript Basics Quiz' });
      if (!existingQuiz.length) {
        const qRes = await query('INSERT INTO quizzes(course_id,title,instructions,pass_percent,published) VALUES(:c,:t,:i,:p,1)',
          { c: cId, t: 'JavaScript Basics Quiz', i: 'Answer all questions. You need 60% to pass.', p: 60 });
        const quizId = qRes.insertId;
        const questions = [
          ['Which keyword declares a block-scoped variable?', 'var', 'let', 'function', 'class', 'b'],
          ['What does typeof null return?', '"null"', '"object"', '"undefined"', '"boolean"', 'b'],
          ['Which method adds an element to the end of an array?', 'push()', 'pop()', 'shift()', 'unshift()', 'a'],
          ['What is the result of 2 + "3"?', '5', '"23"', 'NaN', 'TypeError', 'b']
        ];
        for (let i = 0; i < questions.length; i++) {
          const [qt, oa, ob, oc, od, correct] = questions[i];
          await query('INSERT INTO quiz_questions(quiz_id,question_text,option_a,option_b,option_c,option_d,correct_option,position) VALUES(:qid,:q,:a,:b,:c,:d,:cor,:pos)',
            { qid: quizId, q: qt, a: oa, b: ob, c: oc, d: od, cor: correct, pos: i+1 });
        }
      }
    }

    console.log('Sample courses, lessons, assignments, and quizzes are ready.');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
