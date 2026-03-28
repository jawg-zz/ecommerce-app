import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-4">E-Commerce</h3>
            <p className="text-sm">
              Your one-stop shop for electronics, clothing, and books.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/products?category=ELECTRONICS" className="hover:text-white">
                  Electronics
                </Link>
              </li>
              <li>
                <Link href="/products?category=CLOTHING" className="hover:text-white">
                  Clothing
                </Link>
              </li>
              <li>
                <Link href="/products?category=BOOKS" className="hover:text-white">
                  Books
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Account</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/login" className="hover:text-white">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-white">
                  My Orders
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <p className="text-sm">support@ecommerce.local</p>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-8 text-sm text-center">
          <p>&copy; {new Date().getFullYear()} E-Commerce. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
