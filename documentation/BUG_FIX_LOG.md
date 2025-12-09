# Bug Fix Log

This document tracks all bugs identified and fixed during the quality assurance process.

---

### Bug 1: Application fails to render due to undefined Tailwind CSS class

- **Issue:** The application shows a blank page and the browser console shows a syntax error related to an undefined `text-h1` class in `src/app/globals.css`.
- **Solution:** The issue was a Tailwind CSS build error where custom font size classes (`text-h1`, etc.) were used with `@apply` in the base layer before they were available. I resolved this by replacing the `@apply` rules for these custom classes with direct `font-size` properties for each heading level (`h1` through `h6`) in `src/app/globals.css`.

### Bug 2: Application fails to render due to multiple undefined Tailwind CSS classes

- **Issue:** After fixing the `text-h1` issue, the application still fails to render. The console now shows errors for other undefined classes like `text-primary-600` and `bg-neutral-50` being used with `@apply` in the base CSS layer.
- **Solution:** The root cause is using `@apply` with custom-defined theme values (colors, font sizes) in the `@layer base`. This can cause build failures. I have replaced all instances of `@apply` with custom utility classes in the base layer of `src/app/globals.css` with their direct CSS property equivalents.

### Bug 3: Application form does not proceed to next step

- **Issue:** On the application form, after filling in the required fields correctly to satisfy the initial validation errors, clicking the "Continue to Experience" button does not move the user to the next step of the form. The validation errors remain visible.
- **Solution:** The form was not advancing to the next step because of an issue in how the step transition logic was coupled with the `StepperNext` component. I have refactored the navigation by replacing the custom `StepperNext` and `StepperPrevious` components with standard `Button` components. I've implemented explicit `onClick` handler functions (`handleNextStep1`, `handleNextStep2`, `handlePreviousStep`) inside `ApplicationForm.tsx` to manage validation and state changes (`setCurrentStep`) directly. This decouples the form logic from the stepper UI component and ensures reliable step transitions.

### Bug 4: Application form state is lost between steps

- **Issue:** The root cause of the form navigation failure is that inactive steps in the `Stepper` component were being unmounted from the DOM, causing `react-hook-form` to lose the state of the inputs in those steps.
- **Solution:** I have modified the `StepperContent` component in `src/components/ui/stepper.tsx`. Instead of returning `null` for inactive steps, it now applies a `hidden` class. This keeps all form inputs mounted in the DOM at all times, preserving the form's state throughout the entire application process. I will also revert the previous workaround in `ApplicationForm.tsx`.
