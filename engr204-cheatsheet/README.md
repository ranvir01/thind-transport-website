# ENGR&204 — Ultimate Final Exam Cheat Sheet (Green River College)

Everything here is **self-contained** in this folder and has nothing to do with the rest of the repository (the trucking website). It lives on its own branch so it never touches the site.

## What's in here

| File | Purpose |
|------|---------|
| [`CHEATSHEET.md`](./CHEATSHEET.md) | The master cheat sheet — every formula, method, and decision tree for ENGR&204. Heavy emphasis on **RL / RC / RLC** (end-of-quarter material). |
| [`WORKED-EXAMPLES.md`](./WORKED-EXAMPLES.md) | Fully solved, step-by-step problems for every major problem *type* the final could throw at you. |
| [`course-files/`](./course-files/) | **Put YOUR files here.** Sample exams, HW, notes, quizzes — anything. |

## 📎 Where to upload your files (the GitHub URL you asked for)

Repository: **https://github.com/ranvir01/thind-transport-website**

This work lives on the branch: **`cursor/engr204-ultimate-cheatsheet-be30`**

You have two easy options:

### Option A — Upload straight through the GitHub website (no git needed)
1. Open this link (the intake folder on this exact branch):
   **https://github.com/ranvir01/thind-transport-website/upload/cursor/engr204-ultimate-cheatsheet-be30/engr204-cheatsheet/course-files**
2. Drag-and-drop ALL your files (sample exams, HW, quizzes, lecture notes, photos of handwritten problems — PDFs, images, .docx, .txt, anything).
3. At the bottom, choose **"Commit directly to the `cursor/engr204-ultimate-cheatsheet-be30` branch"** and click **Commit changes**.
4. If you want them sorted, you can instead open each subfolder first:
   - Sample exams → `.../course-files/sample-exams`
   - Homework → `.../course-files/homework`
   - Lecture notes → `.../course-files/lecture-notes`
   - Quizzes → `.../course-files/quizzes`
   - Misc → `.../course-files/other`
   (Don't stress about sorting — dump them anywhere and I'll organize.)

### Option B — Command line
```bash
git clone https://github.com/ranvir01/thind-transport-website
cd thind-transport-website
git checkout cursor/engr204-ultimate-cheatsheet-be30
cp /path/to/your/files/* engr204-cheatsheet/course-files/
git add engr204-cheatsheet/course-files
git commit -m "Add ENGR&204 course files"
git push
```

## ✅ What happens after you upload

Once your real files are in `course-files/`, re-run me (comment on the PR or start a follow-up) and I will:
1. Read every file (exams, HW, quizzes, notes).
2. **Solve every unsolved problem**, step-by-step, and fold the methods into the cheat sheet.
3. Re-weight the cheat sheet toward whatever the past exams emphasize (you mentioned RL/RC/RLC + 4-question format).
4. Add a "Problem Bank" mapping every problem type seen in your files → the exact recipe to solve it.

## Until then

The `CHEATSHEET.md` and `WORKED-EXAMPLES.md` already cover the **full standard ENGR&204 (Electrical Circuits) syllabus** so you have a complete, ready-to-print study weapon right now — built around a typical 4-question final that leans hard on first- and second-order transient circuits.
