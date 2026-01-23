<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('fees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->onDelete('cascade');
            $table->decimal('listing_fee', 8, 2)->default(0);
            $table->decimal('seller_commission', 8, 2)->default(0); // % of transaction
            $table->decimal('buyer_fee', 8, 2)->default(0);
            $table->decimal('payout_fee', 8, 2)->default(0);
            $table->decimal('total_fees', 16, 2)->storedAs('listing_fee + seller_commission + buyer_fee + payout_fee');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fees');
    }
};
