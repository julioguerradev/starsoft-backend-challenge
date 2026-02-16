const API_URL = 'http://localhost:3000/api';

async function createSession() {
  const response = await fetch(`${API_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      movieName: 'Teste de Concorrência',
      roomNumber: 'Sala Teste',
      startTime: new Date(Date.now() + 24 * 3600000).toISOString(),
      price: 25.00,
      seats: Array.from({ length: 16 }, (_, i) => ({
        seatNumber: `T${i + 1}`,
        row: 'T',
      })),
    }),
  });

  const session = await response.json();
  console.log(`✅ Sessão criada: ID ${session.id}`);
  return session;
}

async function reserveSeat(sessionId, seatId, userId) {
  try {
    const response = await fetch(`${API_URL}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        seatIds: [seatId],
        userId,
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${userId}: Reserva criada com sucesso`);
      return { success: true, data: result };
    } else {
      console.log(`❌ ${userId}: ${result.message}`);
      return { success: false, error: result.message };
    }
  } catch (error) {
    console.log(`❌ ${userId}: Erro na requisição - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testConcurrency() {
  console.log('\n🎬 === TESTE DE CONCORRÊNCIA ===\n');

  const session = await createSession();
  const targetSeatId = session.seats[0].id;

  console.log(`\n🎯 Assento alvo: ${session.seats[0].seatNumber} (ID: ${targetSeatId})`);
  console.log(`\n⏳ Aguardando 2 segundos...`);
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const promises = Array.from({ length: 10 }, (_, i) =>
    reserveSeat(session.id, targetSeatId, `user${i + 1}`)
  );

  const results = await Promise.all(promises);

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n\n📊 === RESULTADOS ===`);
  console.log(`✅ Reservas bem-sucedidas: ${successful}`);
  console.log(`❌ Reservas falhadas: ${failed}`);

  if (successful === 1) {
    console.log(`\n✅ TESTE PASSOU! Apenas 1 reserva foi criada (controle de concorrência funcionando)`);
  } else {
    console.log(`\n❌ TESTE FALHOU! ${successful} reservas foram criadas (esperado: 1)`);
  }

  console.log(`\n🔍 Verificando disponibilidade dos assentos...`);
  const seatsResponse = await fetch(`${API_URL}/sessions/${session.id}/seats`);
  const availableSeats = await seatsResponse.json();
  
  console.log(`Assentos disponíveis restantes: ${availableSeats.length}/16`);

  return { successful, failed };
}


testConcurrency()
  .then(() => {
    console.log(`\n✅ Teste concluído!\n`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`\n❌ Erro no teste:`, error);
    process.exit(1);
  });
