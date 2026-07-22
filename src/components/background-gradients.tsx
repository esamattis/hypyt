import { Style } from "@/components/style";

export function BackgroundGradients() {
    return (
        <Style>
            {`
                body {
                    background-image:
                        radial-gradient(ellipse 75% 45% at 5% -10%, rgb(129 140 248 / 0.22), transparent 70%),
                        radial-gradient(ellipse 65% 40% at 105% 30%, rgb(56 189 248 / 0.14), transparent 70%),
                        radial-gradient(ellipse 60% 35% at 15% 105%, rgb(167 139 250 / 0.12), transparent 70%);
                    background-attachment: fixed;
                }

                :root.dark body {
                    background-image:
                        radial-gradient(ellipse 75% 45% at 5% -10%, rgb(99 102 241 / 0.16), transparent 70%),
                        radial-gradient(ellipse 65% 40% at 105% 30%, rgb(14 165 233 / 0.1), transparent 70%),
                        radial-gradient(ellipse 60% 35% at 15% 105%, rgb(139 92 246 / 0.1), transparent 70%);
                }

                @media (prefers-color-scheme: dark) {
                    :root:not(.light) body {
                        background-image:
                            radial-gradient(ellipse 75% 45% at 5% -10%, rgb(99 102 241 / 0.16), transparent 70%),
                            radial-gradient(ellipse 65% 40% at 105% 30%, rgb(14 165 233 / 0.1), transparent 70%),
                            radial-gradient(ellipse 60% 35% at 15% 105%, rgb(139 92 246 / 0.1), transparent 70%);
                    }
                }
            `}
        </Style>
    );
}
