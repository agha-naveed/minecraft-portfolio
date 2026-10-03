// EDIT THIS FILE with your own info.
export const PROJECTS=[
 {t:'Realtime Chat App',d:'WebSocket chat with rooms, typing indicators and file sharing.',s:'React · Node · Socket.io',l:'https://github.com/yourname/chat',images:[]},
 {t:'E-Commerce Store',d:'Full-stack shop with Stripe payments and an admin dashboard.',s:'Next.js · Postgres · Stripe',l:'https://github.com/yourname/shop',images:[]},
 {t:'3D Product Viewer',d:'Interactive WebGL configurator for custom products.',s:'Three.js · R3F · GSAP',l:'https://github.com/yourname/viewer',images:[]}]
const si=s=>`https://cdn.simpleicons.org/${s}`
const dv=s=>`https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${s}/${s}-original.svg`
export const SKILLS=[
 {cat:'Frontend',items:[['HTML',dv('html5')],['CSS',dv('css3')],['JavaScript',si('javascript')],['TypeScript',si('typescript')],['Tailwind CSS',si('tailwindcss')],['Bootstrap',si('bootstrap')],['React',si('react')],['Next.js',si('nextdotjs')]]},
 {cat:'Backend',items:[['Node.js',si('nodedotjs')],['Express',si('express')],['FastAPI',si('fastapi')],['Drizzle ORM',si('drizzle')],['SQLAlchemy',si('sqlalchemy')]]},
 {cat:'Database',items:[['PostgreSQL',si('postgresql')],['MongoDB',si('mongodb')],['Redis',si('redis')],['Neon',si('neon')],['Supabase',si('supabase')]]},
 {cat:'Cloud & Deployment',items:[['Docker',si('docker')],['Railway',si('railway')],['Cloudinary',si('cloudinary')],['Vercel',si('vercel')]]},
 {cat:'Tools',items:[['GitHub',si('github')],['Electron.js',si('electron')]]}]
// images: put files in /public/projects/ and list them like '/projects/chat1.png' (placeholders show if empty)
export const EXPERIENCE=[
 {role:'Full-Stack Developer',org:'Company A',period:'2024 – Present',pts:['Built and shipped customer-facing React/Next.js features','Designed REST APIs with Node.js and PostgreSQL','Cut page load time by 40%']},
 {role:'Frontend Developer Intern',org:'Company B',period:'2023 – 2024',pts:['Created reusable Tailwind component library','Worked with designers on responsive UI']},
 {role:'Freelance Web Developer',org:'Self-employed',period:'2022 – 2023',pts:['Delivered 10+ websites for small businesses','Deployed on Vercel, Railway and Docker']}]
export const CONTACT=[['GitHub','github.com/agha-naveed','https://github.com/agha-naveed'],['LinkedIn','linkedin.com/in/agha-naveed','https://linkedin.com/in/agha-naveed']]
// Put your photo at public/me.jpg
export const ABOUT={name:'Agha Naveed',role:'Full Stack Developer',bio:'I build fast, polished web apps from database to UI. Welcome to my world - explore the gates, shoot the skills and ride around!'}
