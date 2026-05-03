import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn } from "../api/supabase";
import { HOME } from "../services/consts";

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Заполните все поля');
            return;
        }
        setError(null);
        setLoading(true);
        try {
            await signIn(email, password);
            navigate(HOME);
        } catch {
            setError('Неверный логин или пароль');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="login-section page-fade-in">
            <div className="login-hero text-display-xl">ElectroVan</div>
            <div className="login-subheader text-heading-lg">админ панель</div>
            <form className="login-block" onSubmit={handleSubmit}>
                <div className="login-schedule">
                    <div className="login-title text-display-xl">Вход в админ панель</div>
                    <input
                        className="login-graph text-heading-lg"
                        type="email"
                        placeholder="Введите email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        autoComplete="email"
                    />
                    <input
                        className="password-graph text-heading-lg"
                        type="password"
                        placeholder="Введите пароль"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        autoComplete="current-password"
                    />
                    {error && <p className="text-body-md login-error">{error}</p>}
                    <button type="submit" className="login-button text-heading-lg" disabled={loading}>
                        {loading ? 'Вход...' : 'Войти'}
                    </button>
                </div>
            </form>
        </section>
    );
}

export default LoginPage;
