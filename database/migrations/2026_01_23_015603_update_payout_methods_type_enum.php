<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Create a new temporary table with the updated schema
        Schema::create('payout_methods_new', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['paypal', 'multicaixa', 'bank_transfer', 'mobile_money', 'ewallet', 'payshap']);
            $table->json('details');
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });

        // Copy data from old table to new table
        DB::statement('
            INSERT INTO payout_methods_new (id, user_id, type, details, is_default, created_at, updated_at)
            SELECT id, user_id, type, details, is_default, created_at, updated_at
            FROM payout_methods
            WHERE type IN ("paypal", "multicaixa")
        ');

        // Drop the old table
        Schema::drop('payout_methods');

        // Rename the new table
        Schema::rename('payout_methods_new', 'payout_methods');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Create a new temporary table with the original schema
        Schema::create('payout_methods_old', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['paypal', 'multicaixa']);
            $table->json('details');
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });

        // Copy data from current table to old table (only valid types)
        DB::statement('
            INSERT INTO payout_methods_old (id, user_id, type, details, is_default, created_at, updated_at)
            SELECT id, user_id, 
                   CASE 
                       WHEN type IN ("paypal", "multicaixa") THEN type
                       ELSE "paypal" -- default to paypal for any invalid types
                   END as type,
                   details, is_default, created_at, updated_at
            FROM payout_methods
        ');

        // Drop the current table
        Schema::drop('payout_methods');

        // Rename the old table back
        Schema::rename('payout_methods_old', 'payout_methods');
    }
};