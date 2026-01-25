<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::create('earnings', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->constrained()->cascadeOnDelete();
        $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
        $table->string('currency', 3);
        $table->decimal('amount', 24, 8);
        $table->decimal('fee', 24, 8)->default(0);
        $table->decimal('net_amount', 24, 8);
        $table->string('type')->default('exchange'); // exchange, referral, bonus, etc.
        $table->string('status')->default('available'); // available, processing, paid
        $table->json('metadata')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('earnings');
    }
};
