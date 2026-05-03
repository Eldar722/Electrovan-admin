import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import { routes } from "../services/routes";
import { getSession, onAuthStateChange, checkIsAdmin, signOut } from "../api/supabase";
import MainLayout from "./MainLayout";
import { LOGIN, HOME } from "../services/consts";

async function resolveSession(rawSession) {
    if (!rawSession) return null;
    const isAdmin = await checkIsAdmin(rawSession.user.id);
    if (!isAdmin) { await signOut(); return null; }
    return rawSession;
}

function AppRouter() {
    const [session, setSession] = useState(undefined);

    useEffect(() => {
        getSession().then(async ({ data }) => {
            setSession(await resolveSession(data.session));
        });
        const { data: { subscription } } = onAuthStateChange(async (_event, s) => {
            setSession(await resolveSession(s));
        });
        return () => subscription.unsubscribe();
    }, []);

    if (session === undefined) return null;

    const loginRoute = routes.find(r => r.path === LOGIN);
    const LoginElement = loginRoute.element;
    const protectedRoutes = routes.filter(r => r.path !== LOGIN);

    return (
        <Routes>
            {/* Root "/" → redirect to /home (authed) or /login (guest) */}
            <Route
                path="/"
                element={session ? <Navigate to={HOME} replace /> : <Navigate to={LOGIN} replace />}
            />
            <Route
                path={LOGIN}
                element={session ? <Navigate to={HOME} replace /> : <LoginElement />}
            />
            <Route element={session ? <MainLayout /> : <Navigate to={LOGIN} replace />}>
                {protectedRoutes.map((route, index) => (
                    <Route key={index} path={route.path} element={<route.element />} />
                ))}
            </Route>
            {/* Catch-all: redirect unknown paths to login or home */}
            <Route
                path="*"
                element={session ? <Navigate to={HOME} replace /> : <Navigate to={LOGIN} replace />}
            />
        </Routes>
    );
}

export default AppRouter;
