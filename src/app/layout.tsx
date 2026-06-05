import './global.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] });

const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <html lang="en" className={inter.className}>
            <body>
                <div className='h-full w-full'>{children}</div>
            </body>
        </html>
    );
}

export default Layout;