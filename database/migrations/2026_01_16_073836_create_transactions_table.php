<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            
            // User and wallet relationships
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('wallet_id')->constrained()->onDelete('cascade');
            
            // For exchange transactions (buyer/seller)
            $table->foreignId('counterparty_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('listing_id')->nullable()->constrained()->onDelete('set null');
            
            // Transaction amounts
            $table->decimal('amount', 15, 2);  // Gross amount
            $table->decimal('net_amount', 15, 2);  // Amount after all fees
            $table->decimal('platform_fee', 15, 2)->default(0);  // Fixed platform fee
            $table->decimal('platform_fee_percentage', 5, 2)->default(0);  // Percentage platform fee
            $table->decimal('seller_fee', 15, 2)->default(0);  // Fixed seller fee
            $table->decimal('seller_fee_percentage', 5, 2)->default(0);  // Percentage seller fee
            $table->decimal('total_fees', 15, 2)->default(0);  // Sum of all fees
            
            // Currency and type
            $table->string('currency', 3);
            $table->enum('type', [
                'deposit', 
                'withdrawal', 
                'transfer',
                'exchange_buy',
                'exchange_sell',
                'platform_fee'  // For tracking platform fee transactions
            ]);
            
            // Status tracking
            $table->enum('status', [
                'pending', 
                'completed', 
                'failed', 
                'cancelled',
                'disputed',
                'refunded',
                'partially_refunded'
            ])->default('pending');
            
            // References and metadata
            $table->string('reference')->unique();
            $table->string('provider_reference')->nullable();
            $table->json('metadata')->nullable();
            $table->text('notes')->nullable();
            
            // Timestamps
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->timestamps();

            // Indexes
            $table->index(['user_id', 'status']);
            $table->index(['wallet_id', 'status']);
            $table->index(['counterparty_id', 'status']);
            $table->index('reference');
            $table->index('provider_reference');
            $table->index('type');
            $table->index('created_at');
        });
    }

    public function down()
    {
        Schema::dropIfExists('transactions');
    }
};