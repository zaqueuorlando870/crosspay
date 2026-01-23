<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('listings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('currency', 3);
            $table->decimal('amount', 15, 2);
            $table->decimal('fee', 5, 2);
            $table->decimal('exchange_rate', 15, 6);
            $table->decimal('final_rate', 15, 6);
            $table->decimal('total_amount', 15, 2);
            $table->decimal('profit', 15, 2);
            $table->string('status')->default('active');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('listings');
    }
};
