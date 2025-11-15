import React from 'react';
import { getDayOfYear } from 'date-fns';
import { Lightbulb } from 'lucide-react';

const frases = [
  "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
  "A única maneira de fazer um excelente trabalho é amar o que você faz. - Steve Jobs",
  "Não espere por oportunidades, crie-as.",
  "O fracasso é apenas a oportunidade de começar de novo, desta vez de forma mais inteligente. - Henry Ford",
  "Sua mente é um ativo poderoso. Quando preenchida com pensamentos positivos, sua vida começará a mudar.",
  "O maior risco é não correr risco algum. Em um mundo que muda rapidamente, a única estratégia garantida a falhar é não arriscar.",
  "Se você pode sonhar, você pode fazer.",
  "A persistência realiza o impossível.",
  "Feito é melhor que perfeito.",
  "Comece onde você está. Use o que você tem. Faça o que você pode. - Arthur Ashe",
  "A inspiração existe, mas ela precisa te encontrar trabalhando. - Pablo Picasso",
  "Determine que algo pode e deve ser feito, e então você achará o caminho para fazê-lo. - Abraham Lincoln",
  "O empreendedorismo é viver alguns anos da sua vida como a maioria das pessoas não quer, para que você possa viver o resto da sua vida como a maioria das pessoas não pode.",
  "Não tenha medo de desistir do bom para perseguir o ótimo. - John D. Rockefeller",
  "O segredo para ir em frente é começar.",
  "Tudo o que um sonho precisa para ser realizado é alguém que acredite que ele possa ser realizado. - Roberto Shinyashiki",
  "O primeiro passo para o sucesso é acreditar que você pode.",
  "Coragem é a resistência ao medo, o domínio do medo - não a ausência do medo. - Mark Twain",
  "Defina o sucesso em seus próprios termos, alcance-o por suas próprias regras e construa uma vida que você tenha orgulho de viver.",
  "O seu tempo é limitado, não o desperdice vivendo a vida de outra pessoa."
];

const getFraseDoDia = () => {
  const hoje = new Date();
  const diaDoAno = getDayOfYear(hoje);
  const indice = diaDoAno % frases.length;
  return frases[indice];
};

export default function FraseMotivacional() {
  const fraseDoDia = getFraseDoDia();

  return (
    <div className="mb-8 p-4 bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-200 rounded-lg shadow-sm flex items-start gap-4">
      <Lightbulb className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
      <blockquote className="text-blue-800 italic text-base leading-relaxed">
        "{fraseDoDia}"
      </blockquote>
    </div>
  );
}