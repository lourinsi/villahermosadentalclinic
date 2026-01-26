"use client";

import { ShoppingCart } from "lucide-react";

const CartPage = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <ShoppingCart className="w-16 h-16 mb-4 text-gray-300" />
            <h1 className="text-2xl font-bold">Your Cart is Empty</h1>
            <p className="text-muted-foreground mt-2">
                This feature is not yet available.
            </p>
        </div>
    );
};

export default CartPage;
