import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Limpar dados
  await prisma.sale.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.session.deleteMany();

  // Criar 3 sessões com 16 assentos cada
  const session1 = await prisma.session.create({
    data: {
      movieName: 'Avatar: O Caminho da Água',
      roomNumber: 'Sala 1',
      startTime: new Date(Date.now() + 3 * 3600000),
      price: 25.00,
      seats: {
        create: Array.from({ length: 16 }, (_, i) => {
          const row = String.fromCharCode(65 + Math.floor(i / 8));
          const num = (i % 8) + 1;
          return {
            seatNumber: `${row}${num}`,
            row,
            status: 'AVAILABLE',
          };
        }),
      },
    },
  });

  const session2 = await prisma.session.create({
    data: {
      movieName: 'Homem-Aranha: Através do Aranhaverso',
      roomNumber: 'Sala 2',
      startTime: new Date(Date.now() + 5 * 3600000),
      price: 28.00,
      seats: {
        create: Array.from({ length: 16 }, (_, i) => {
          const row = String.fromCharCode(65 + Math.floor(i / 8));
          const num = (i % 8) + 1;
          return {
            seatNumber: `${row}${num}`,
            row,
            status: 'AVAILABLE',
          };
        }),
      },
    },
  });

  const session3 = await prisma.session.create({
    data: {
      movieName: 'Oppenheimer',
      roomNumber: 'Sala 3',
      startTime: new Date(Date.now() + 7 * 3600000),
      price: 30.00,
      seats: {
        create: Array.from({ length: 16 }, (_, i) => {
          const row = String.fromCharCode(65 + Math.floor(i / 8));
          const num = (i % 8) + 1;
          return {
            seatNumber: `${row}${num}`,
            row,
            status: 'AVAILABLE',
          };
        }),
      },
    },
  });

  console.log(`✅ Sessão 1 criada: ${session1.id} - ${session1.movieName}`);
  console.log(`✅ Sessão 2 criada: ${session2.id} - ${session2.movieName}`);
  console.log(`✅ Sessão 3 criada: ${session3.id} - ${session3.movieName}`);
  console.log('🎉 Seed completo!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
