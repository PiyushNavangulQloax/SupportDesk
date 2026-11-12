import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, LifeBuoy } from "lucide-react";
import { useAuth } from "../lib/auth";
import { ApiError, type LoginInput } from "../lib/api-client";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Alert } from "../components/ui/Alert";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, sessionExpired, clearSessionExpiredFlag } = useAuth();

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // If already authenticated, redirect to target or home
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  const onSubmit = async (data: LoginInput): Promise<void> => {
    setErrorMessage(null);
    clearSessionExpiredFlag();
    setIsSubmitting(true);

    try {
      await login(data);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          // Invalid credentials message from backend
          setErrorMessage(err.message || "Invalid email or password");
        } else if (err.status === 429) {
          // Rate limit exceeded message
          setErrorMessage(
            err.message || "Too many login attempts. Please wait 15 minutes before trying again."
          );
        } else if (err.status === 0 || err.code === "NETWORK_ERROR") {
          // Network connection error
          setErrorMessage(
            "Unable to connect to SupportDesk server. Please check your network connection or verify that the API server is running."
          );
        } else {
          setErrorMessage(err.message || "An unexpected error occurred during login.");
        }
      } else {
        setErrorMessage("An unexpected client error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="w-full max-w-md space-y-6">
        {/* SupportDesk Branding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 text-white shadow-md mb-2">
            <LifeBuoy className="w-8 h-8" aria-hidden="true" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            SupportDesk
          </h1>
          <p className="text-sm text-gray-600">
            Sign in to access your customer support dashboard
          </p>
        </div>

        {/* Login Form Card */}
        <Card className="shadow-lg border-gray-200/80">
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-5"
            aria-label="Sign in form"
          >
            {/* Session Expired Banner */}
            {sessionExpired && !errorMessage && (
              <Alert
                variant="warning"
                title="Session Expired"
                onClose={clearSessionExpiredFlag}
              >
                Your session has expired. Please sign in again to continue.
              </Alert>
            )}

            {/* Error Message Banner */}
            {errorMessage && (
              <Alert
                variant="error"
                title="Sign in failed"
                onClose={() => setErrorMessage(null)}
              >
                {errorMessage}
              </Alert>
            )}

            {/* Email Field */}
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              label="Email address"
              placeholder="name@company.com"
              leftIcon={<Mail className="w-4 h-4" aria-hidden="true" />}
              error={errors.email?.message}
              {...register("email", {
                required: "Email address is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Please enter a valid email address",
                },
              })}
            />

            {/* Password Field with Show/Hide Toggle */}
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              label="Password"
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" aria-hidden="true" />}
              rightIcon={
                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-brand-600 p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              }
              error={errors.password?.message}
              {...register("password", {
                required: "Password is required",
                // Notice: NO 8-character minimum on login per backend loginBodySchema contract
              })}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full text-base py-2.5 font-semibold"
              isLoading={isSubmitting}
            >
              Sign in to SupportDesk
            </Button>
          </form>
        </Card>

        {/* Footer info */}
        <p className="text-center text-xs text-gray-500">
          SupportDesk Enterprise Portal &bull; Role-based access control enabled
        </p>
      </div>
    </div>
  );
};
