import { writeFileSync } from 'fs';

const response = await fetch('https://www.msudenver.edu/programs/?type=majors');
const html = await response.text();

const linkRegex = /<a href="(https:\/\/www\.msudenver\.edu\/[^"]+)"[^>]*>[\s\S]*?<h3 class="post-title">([\s\S]*?)<\/h3>/g;

const programs = [];
let match;
while ((match = linkRegex.exec(html)) !== null) {
  const url = match[1];
  const rawTitle = match[2].trim().replace(/\s+/g, ' ');

  // strip everything from "Major" onwards
  const cleanTitle = rawTitle.replace(/\s*Major.*$/i, '').trim();

  programs.push({ title: cleanTitle, url, fullTitle: rawTitle });
}

console.log(`Found ${programs.length} programs`);
writeFileSync('./raw/msu_programs.json', JSON.stringify(programs, null, 2));
console.log('Saved to raw/msu_programs.json');