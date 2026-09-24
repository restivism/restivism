import { useSeoMeta } from "@unhead/react";
import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useSeoMeta({
    title: "404 - Page Not Found",
    description: "The page you are looking for could not be found. Return to the home page to continue browsing.",
  });

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-display text-7xl font-semibold text-primary">404</p>
        <h1 className="mt-4 text-3xl font-semibold">This path leads nowhere.</h1>
        <p className="mt-2 text-lg text-muted-foreground">Which, honestly, is a fine place to rest for a moment.</p>
        <Link
          to="/"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Back to today
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
