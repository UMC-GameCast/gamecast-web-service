## Tailwind CSS Coding Conventions
You **MUST** strictly follow these conventions when writing JSX and applying styles. This is critical for our project's maintainability.

### 1. Utility-First Principle
- **Always use utility classes directly in the JSX `className` prop.**
- **DO NOT** use the `@apply` directive in CSS files to create custom component classes like `.btn-primary`. Instead, create a reusable React component (e.g., `<Button variant="primary">`). This is the idiomatic way to work with Tailwind in a React project.

### 2. Configuration is Key
- **Use the `tailwind.config.js` file as the single source of truth for design tokens.**
- If you need a custom color, spacing, font size, or any other design value, you **MUST** extend the `theme` object in `tailwind.config.js`.
- **DO NOT** use arbitrary values (e.g., `top-[13px]`, `bg-[#123456]`) unless it is absolutely unavoidable for a one-off style. Always prefer defining a value in the config file.

### 3. Component-Based Reusability
- For repeated UI elements like buttons, cards, or inputs, **create a dedicated React component.**
- Pass props to the component to handle variations. For example, a `<Button>` component might accept `size`, `variant`, and `color` props to dynamically apply different Tailwind classes.
- **Example of a good component:**

// GOOD: props control styling
const Button = ({ children, variant }) => {
const baseClasses = "font-bold py-2 px-4 rounded";
const variantClasses = variant === 'primary'
? "bg-blue-500 text-white"
: "bg-gray-500 text-black";
return <button className={${baseClasses} ${variantClasses}}>{children}</button>;
};


### 4. Class Ordering
- All Tailwind class strings **MUST** be automatically sorted to maintain consistency and readability.
- We use the official **Prettier plugin for Tailwind CSS (`prettier-plugin-tailwindcss`)** for this. Ensure your development environment is set up to use it. The AI should generate code that follows this standard ordering.
